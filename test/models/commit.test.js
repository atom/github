import dedent from 'dedent-js';

import {nullCommit} from '../../lib/models/commit';
import {commitBuilder} from '../builder/commit';

describe('Commit', function() {
  describe('isBodyLong()', function() {
    it('returns false if the commit message body is short', function() {
      const commit = commitBuilder().messageBody('short').build();
      assert.isFalse(commit.isBodyLong());
    });

    it('returns true if the commit message body is long', function() {
      const messageBody = dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei. Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim.

        Ea salutatus contentiones eos. Eam in veniam facete volutpat, solum appetere adversarium ut quo. Vel cu appetere
        urbanitas, usu ut aperiri mediocritatem, alia molestie urbanitas cu qui. Velit antiopam erroribus no eum,
        scripta iudicabit ne nam, in duis clita commodo sit.

        Assum sensibus oportere te vel, vis semper evertitur definiebas in. Tamquam feugiat comprehensam ut his, et eum
        voluptua ullamcorper, ex mei debitis inciderint. Sit discere pertinax te, an mei liber putant. Ad doctus
        tractatos ius, duo ad civibus alienum, nominati voluptaria sed an. Libris essent philosophia et vix. Nusquam
        reprehendunt et mea. Ea eius omnes voluptua sit.

        No cum illud verear efficiantur. Id altera imperdiet nec. Noster audiam accusamus mei at, no zril libris nemore
        duo, ius ne rebum doctus fuisset. Legimus epicurei in sit, esse purto suscipit eu qui, oporteat deserunt
        delicatissimi sea in. Est id putent accusata convenire, no tibique molestie accommodare quo, cu est fuisset
        offendit evertitur.
      `;
      const commit = commitBuilder().messageBody(messageBody).build();
      assert.isTrue(commit.isBodyLong());
    });

    it('returns true if the commit message body contains too many newlines', function() {
      let messageBody = 'a\n';
      for (let i = 0; i < 50; i++) {
        messageBody += 'a\n';
      }
      const commit = commitBuilder().messageBody(messageBody).build();
      assert.isTrue(commit.isBodyLong());
    });

    it('returns false for a null commit', function() {
      assert.isFalse(nullCommit.isBodyLong());
    });
  });

  describe('abbreviatedBody()', function() {
    it('returns the message body as-is when the body is short', function() {
      const commit = commitBuilder().messageBody('short').build();
      assert.strictEqual(commit.abbreviatedBody(), 'short');
    });

    it('truncates the message body at the last paragraph boundary before the cutoff if one is present', function() {
      const body = dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei.

        Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim. Ea salutatus contentiones eos. Eam in veniam facete
        volutpat, solum appetere adversarium ut quo. Vel cu appetere urbanitas, usu ut aperiri mediocritatem, alia
        molestie urbanitas cu qui.

        Velit antiopam erroribus no eu|m, scripta iudicabit ne nam, in duis clita commodo
        sit. Assum sensibus oportere te vel, vis semper evertitur definiebas in. Tamquam feugiat comprehensam ut his, et
        eum voluptua ullamcorper, ex mei debitis inciderint. Sit discere pertinax te, an mei liber putant. Ad doctus
        tractatos ius, duo ad civibus alienum, nominati voluptaria sed an. Libris essent philosophia et vix. Nusquam
        reprehendunt et mea. Ea eius omnes voluptua sit.
      `;

      const commit = commitBuilder().messageBody(body).build();
      assert.strictEqual(commit.abbreviatedBody(), dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei.

        Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim. Ea salutatus contentiones eos. Eam in veniam facete
        volutpat, solum appetere adversarium ut quo. Vel cu appetere urbanitas, usu ut aperiri mediocritatem, alia
        molestie urbanitas cu qui.

        ...
      `);
    });

    it('truncates the message body at the nearest word boundary before the cutoff if one is present', function() {
      // The | is at the 500-character mark.
      const body = dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei. Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim. Ea salutatus contentiones eos. Eam in veniam facete
        volutpat, solum appetere adversarium ut quo. Vel cu appetere urbanitas, usu ut aperiri mediocritatem, alia
        molestie urbanitas cu qui. Velit antiopam erroribus no eum,| scripta iudicabit ne nam, in duis clita commodo
        sit. Assum sensibus oportere te vel, vis semper evertitur definiebas in. Tamquam feugiat comprehensam ut his, et
        eum voluptua ullamcorper, ex mei debitis inciderint. Sit discere pertinax te, an mei liber putant. Ad doctus
        tractatos ius, duo ad civibus alienum, nominati voluptaria sed an. Libris essent philosophia et vix. Nusquam
        reprehendunt et mea. Ea eius omnes voluptua sit. No cum illud verear efficiantur. Id altera imperdiet nec.
        Noster audia|m accusamus mei at, no zril libris nemore duo, ius ne rebum doctus fuisset. Legimus epicurei in
        sit, esse purto suscipit eu qui, oporteat deserunt delicatissimi sea in. Est id putent accusata convenire, no
        tibique molestie accommodare quo, cu est fuisset offendit evertitur.
      `;

      const commit = commitBuilder().messageBody(body).build();
      assert.strictEqual(commit.abbreviatedBody(), dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei. Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim. Ea salutatus contentiones eos. Eam in veniam facete
        volutpat, solum appetere adversarium ut quo. Vel cu appetere urbanitas, usu ut aperiri mediocritatem, alia
        molestie urbanitas cu qui. Velit antiopam erroribus no...
      `);
    });

    it('truncates the message body at the character cutoff if no word or paragraph boundaries can be found', function() {
      // The | is at the 500-character mark.
      const body = 'Loremipsumdolorsitamet,ethisjustodeleniti,omniumfastidiiadversariumathas.' +
        'Mazimalterumseaea,essentmalorumpersiusnemei.Nameatemporqualisque,modusdomingtehas.Affertdolore' +
        'albuciustevis,eamtantasnullamcorrumpitad,inoratioluptatumeleifendvim.Easalutatuscontentioneseos.' +
        'Eaminveniamfacetevolutpat,solumappetereadversariumutquo.Velcuappetereurbanitas,usuutaperiri' +
        'mediocritatem,aliamolestieurbanitascuqui.Velitantiopamerroribusnoeum,scriptaiudicabitnenam,in' +
        'duisclitacommodosit.Assumsensibusoporteretevel,vissem|perevertiturdefiniebasin.Tamquamfeugiat' +
        'comprehensamuthis,eteumvoluptuaullamcorper,exmeidebitisinciderint.Sitdiscerepertinaxte,anmei' +
        'liberputant.Addoctustractatosius,duoadcivibusalienum,nominativoluptariasedan.Librisessent' +
        'philosophiaetvix.Nusquamreprehenduntetmea.Eaeiusomnesvoluptuasit.Nocumilludverearefficiantur.Id' +
        'alteraimperdietnec.Nosteraudiamaccusamusmeiat,nozrillibrisnemoreduo,iusnerebumdoctusfuisset.' +
        'Legimusepicureiinsit,essepurtosuscipiteuqui,oporteatdeseruntdelicatissimiseain.Estidputent' +
        'accusataconvenire,notibiquemolestieaccommodarequo,cuestfuissetoffenditevertitur.';

      const commit = commitBuilder().messageBody(body).build();
      assert.strictEqual(
        commit.abbreviatedBody(),
        'Loremipsumdolorsitamet,ethisjustodeleniti,omniumfastidiiadversariumathas.' +
        'Mazimalterumseaea,essentmalorumpersiusnemei.Nameatemporqualisque,modusdomingtehas.Affertdolore' +
        'albuciustevis,eamtantasnullamcorrumpitad,inoratioluptatumeleifendvim.Easalutatuscontentioneseos.' +
        'Eaminveniamfacetevolutpat,solumappetereadversariumutquo.Velcuappetereurbanitas,usuutaperiri' +
        'mediocritatem,aliamolestieurbanitascuqui.Velitantiopamerroribusnoeum,scriptaiudicabitnenam,in' +
        'duisclitacommodosit.Assumsensibusoporteretevel,vis...',
      );
    });

    it('truncates the message body when it contains too many newlines', function() {
      let messageBody = '';
      for (let i = 0; i < 50; i++) {
        messageBody += `${i}\n`;
      }
      const commit = commitBuilder().messageBody(messageBody).build();
      assert.strictEqual(commit.abbreviatedBody(), '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n...');
    });
  });
});
